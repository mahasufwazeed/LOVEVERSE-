#include "LVRoomBuilder.h"

#include "Components/StaticMeshComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

ALVRoomBuilder::ALVRoomBuilder()
{
    PrimaryActorTick.bCanEverTick = false;
    RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("RoomRoot"));
}

void ALVRoomBuilder::OnConstruction(const FTransform& Transform)
{
    Super::OnConstruction(Transform);
    BuildDefaultCoupleRoom();
}

void ALVRoomBuilder::BuildDefaultCoupleRoom()
{
    ClearGeneratedMeshes();
    AddRoomMesh(TEXT("Floor"), FVector(0, 0, -6), FVector(7.0f, 6.0f, 0.12f), FLinearColor(0.86f, 0.72f, 0.56f, 1));
    AddRoomMesh(TEXT("BackWall"), FVector(0, 310, 160), FVector(7.0f, 0.12f, 3.2f), FLinearColor(1.0f, 0.94f, 0.97f, 1));
    AddRoomMesh(TEXT("LeftWall"), FVector(-360, 0, 160), FVector(0.12f, 6.0f, 3.2f), FLinearColor(0.98f, 0.92f, 1.0f, 1));
    AddRoomMesh(TEXT("Rug"), FVector(0, 0, 2), FVector(2.6f, 1.8f, 0.04f), FLinearColor(1.0f, 0.78f, 0.86f, 1));
    AddRoomMesh(TEXT("SofaBase"), FVector(0, 220, 35), FVector(2.6f, 0.78f, 0.42f), FLinearColor(0.62f, 0.51f, 1.0f, 1));
    AddRoomMesh(TEXT("SofaBack"), FVector(0, 260, 90), FVector(2.6f, 0.25f, 0.85f), FLinearColor(0.62f, 0.51f, 1.0f, 1));
    AddRoomMesh(TEXT("Bed"), FVector(-230, -120, 35), FVector(1.45f, 2.2f, 0.42f), FLinearColor(0.92f, 0.72f, 0.56f, 1));
    AddRoomMesh(TEXT("TvScreen"), FVector(180, 298, 180), FVector(1.7f, 0.06f, 1.0f), FLinearColor(0.04f, 0.05f, 0.09f, 1));
}

void ALVRoomBuilder::ClearGeneratedMeshes()
{
    for (UStaticMeshComponent* Mesh : GeneratedMeshes)
    {
        if (Mesh)
        {
            Mesh->DestroyComponent();
        }
    }
    GeneratedMeshes.Empty();
}

UStaticMeshComponent* ALVRoomBuilder::AddRoomMesh(const FString& Name, FVector Location, FVector Scale, FLinearColor Color)
{
    static ConstructorHelpers::FObjectFinder<UStaticMesh> CubeMesh(TEXT("/Engine/BasicShapes/Cube.Cube"));
    UStaticMeshComponent* Mesh = NewObject<UStaticMeshComponent>(this, FName(*Name));
    Mesh->SetupAttachment(RootComponent);
    Mesh->RegisterComponent();
    GeneratedMeshes.Add(Mesh);
    Mesh->SetRelativeLocation(Location);
    Mesh->SetRelativeScale3D(Scale);
    Mesh->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);

    if (CubeMesh.Succeeded())
    {
        Mesh->SetStaticMesh(CubeMesh.Object);
    }

    UMaterialInstanceDynamic* Material = Mesh->CreateAndSetMaterialInstanceDynamic(0);
    if (Material)
    {
        Material->SetVectorParameterValue(TEXT("Color"), Color);
        Material->SetVectorParameterValue(TEXT("BaseColor"), Color);
    }

    return Mesh;
}
