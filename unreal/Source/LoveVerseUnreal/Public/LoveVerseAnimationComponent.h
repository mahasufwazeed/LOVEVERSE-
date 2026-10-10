#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "LVTypes.h"
#include "LoveVerseAnimationComponent.generated.h"

class UAnimMontage;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FLVLocomotionChanged, ELVLocomotionState, LocomotionState);

UCLASS(ClassGroup=(LoveVerse), meta=(BlueprintSpawnableComponent))
class LOVEVERSEUNREAL_API ULoveVerseAnimationComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    ULoveVerseAnimationComponent();

    UFUNCTION(BlueprintCallable, Category = "LoveVerse|Animation")
    void SetLocomotionState(ELVLocomotionState NewState);

    UFUNCTION(BlueprintCallable, Category = "LoveVerse|Animation")
    void PlayInteraction(ELVCoupleInteraction Interaction);

    UFUNCTION(BlueprintPure, Category = "LoveVerse|Animation")
    ELVLocomotionState GetLocomotionState() const { return LocomotionState; }

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "LoveVerse|Animation")
    TMap<ELVCoupleInteraction, TObjectPtr<UAnimMontage>> InteractionMontages;

    UPROPERTY(BlueprintAssignable, Category = "LoveVerse|Animation")
    FLVLocomotionChanged OnLocomotionChanged;

protected:
    virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

    UFUNCTION(Server, Reliable)
    void ServerSetLocomotionState(ELVLocomotionState NewState);

private:
    UPROPERTY(ReplicatedUsing=OnRep_LocomotionState)
    ELVLocomotionState LocomotionState = ELVLocomotionState::Idle;

    UPROPERTY(Replicated)
    ELVCoupleInteraction ActiveInteraction = ELVCoupleInteraction::Idle;

    UFUNCTION()
    void OnRep_LocomotionState();

    void ApplyLocomotionState(ELVLocomotionState NewState);
};
