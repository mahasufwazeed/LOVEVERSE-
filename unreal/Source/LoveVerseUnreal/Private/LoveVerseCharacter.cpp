#include "LoveVerseCharacter.h"

#include "GameFramework/CharacterMovementComponent.h"
#include "LoveVerseAnimationComponent.h"
#include "LoveVerseAvatarComponent.h"
#include "LoveVerseCustomizationComponent.h"
#include "LoveVerseEmotionComponent.h"

ALoveVerseCharacter::ALoveVerseCharacter()
{
    AvatarComponent = CreateDefaultSubobject<ULoveVerseAvatarComponent>(TEXT("AvatarComponent"));
    AnimationComponent = CreateDefaultSubobject<ULoveVerseAnimationComponent>(TEXT("AnimationComponent"));
    CustomizationComponent = CreateDefaultSubobject<ULoveVerseCustomizationComponent>(TEXT("CustomizationComponent"));
    EmotionComponent = CreateDefaultSubobject<ULoveVerseEmotionComponent>(TEXT("EmotionComponent"));
}

void ALoveVerseCharacter::BeginPlay()
{
    Super::BeginPlay();
    CustomizationComponent->OnAppearanceChanged.AddDynamic(this, &ALoveVerseCharacter::HandleAppearanceChanged);
    EmotionComponent->OnExpressionChanged.AddDynamic(this, &ALoveVerseCharacter::HandleExpressionChanged);
    HandleAppearanceChanged(CustomizationComponent->GetAppearance());
    HandleExpressionChanged(EmotionComponent->GetExpression());
}

void ALoveVerseCharacter::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    if (!HasAuthority())
    {
        return;
    }

    const float Speed = GetVelocity().Size2D();
    ELVLocomotionState DesiredState = ELVLocomotionState::Idle;
    if (GetCharacterMovement()->IsFalling())
    {
        DesiredState = ELVLocomotionState::Jumping;
    }
    else if (Speed > 350.0f)
    {
        DesiredState = ELVLocomotionState::Running;
    }
    else if (Speed > 10.0f)
    {
        DesiredState = ELVLocomotionState::Walking;
    }
    AnimationComponent->SetLocomotionState(DesiredState);
}

void ALoveVerseCharacter::PlayInteractionPose(ELVCoupleInteraction Interaction, bool bIsPartner)
{
    Super::PlayInteractionPose(Interaction, bIsPartner);
    AnimationComponent->PlayInteraction(Interaction);
}

void ALoveVerseCharacter::HandleAppearanceChanged(const FLVAvatarAppearance& Appearance)
{
    AvatarComponent->ApplyAppearanceToAvatar(Appearance);
}

void ALoveVerseCharacter::HandleExpressionChanged(ELVFacialExpression Expression)
{
    SetExpression(Expression);
}
